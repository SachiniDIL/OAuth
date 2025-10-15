import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import {executeQuery} from "@/lib/db";

// Configure Google Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const name = profile.displayName;
                const providerId = profile.id;
                const profilePicture = profile.photos?.[0]?.value || null;

                // Check if user exists
                const existingUser = await executeQuery({
                    query: 'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
                    values: ['google', providerId],
                });

                if (existingUser.length > 0) {
                    // Update existing user
                    await executeQuery({
                        query: 'UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?',
                        values: [name, email, profilePicture, existingUser[0].id],
                    });
                    return done(null, existingUser[0]);
                }

                // Create new user
                const result = await executeQuery({
                    query: `INSERT INTO users (email, name, provider, provider_id, profile_picture) 
                  VALUES (?, ?, ?, ?, ?)`,
                    values: [email, name, 'google', providerId, profilePicture],
                });

                const newUser = {
                    id: result.insertId,
                    email,
                    name,
                    provider: 'google',
                    provider_id: providerId,
                    profile_picture: profilePicture,
                };

                done(null, newUser);
            } catch (error) {
                console.error('Google OAuth error:', error);
                done(error, null);
            }
        }
    )
);

// Configure Facebook Strategy
passport.use(
    new FacebookStrategy(
        {
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: process.env.FACEBOOK_CALLBACK_URL,
            profileFields: ['id', 'displayName', 'email', 'picture.type(large)'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
                const name = profile.displayName;
                const providerId = profile.id;
                const profilePicture = profile.photos?.[0]?.value || null;

                // Check if user exists
                const existingUser = await executeQuery({
                    query: 'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
                    values: ['facebook', providerId],
                });

                if (existingUser.length > 0) {
                    // Update existing user
                    await executeQuery({
                        query: 'UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?',
                        values: [name, email, profilePicture, existingUser[0].id],
                    });
                    return done(null, existingUser[0]);
                }

                // Create new user
                const result = await executeQuery({
                    query: `INSERT INTO users (email, name, provider, provider_id, profile_picture) 
                  VALUES (?, ?, ?, ?, ?)`,
                    values: [email, name, 'facebook', providerId, profilePicture],
                });

                const newUser = {
                    id: result.insertId,
                    email,
                    name,
                    provider: 'facebook',
                    provider_id: providerId,
                    profile_picture: profilePicture,
                };

                done(null, newUser);
            } catch (error) {
                console.error('Facebook OAuth error:', error);
                done(error, null);
            }
        }
    )
);

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await executeQuery({
            query: 'SELECT * FROM users WHERE id = ?',
            values: [id],
        });
        done(null, user[0] || null);
    } catch (error) {
        done(error, null);
    }
});

export default passport;